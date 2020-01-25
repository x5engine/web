/* eslint-disable no-console */
/* eslint-disable nonblock-statement-body-position */
/* eslint-disable no-lonely-if */
load_tokens();

var localStorage = window.localStorage ? window.localStorage : {};
const quickstartURL = document.location.origin + '/bounty/quickstart';

let params = (new URL(document.location)).searchParams;

let FEE_PERCENTAGE = document.FEE_PERCENTAGE / 100.0;

var new_bounty = {
  last_sync: new Date()
};

if (localStorage['quickstart_dontshow'] !== 'true' &&
    doShowQuickstart(document.referrer) &&
    doShowQuickstart(document.URL)) {
  window.location = quickstartURL;
}

function doShowQuickstart(url) {
  let blacklist = [];

  blacklist.push(document.location.origin + '/bounty/quickstart');
  blacklist.push(document.location.origin + '/bounty/new\\?');
  blacklist.push(document.location.origin + '/funding/new\\?');
  blacklist.push(document.location.origin + '/new\\?');

  for (let i = 0; i < blacklist.length; i++) {
    if (url.match(blacklist[i]))
      return false;
  }

  return true;
}

var processedData;
var usersBySkills;

$('.select2-tag__choice').on('click', function() {
  $('#invite-contributors.js-select2').data('select2').dataAdapter.select(processedData[0].children[$(this).data('id')]);
});

$('.select2-add_byskill').on('click', function(e) {
  e.preventDefault();
  $('#invite-contributors.js-select2').val(usersBySkills.map((item) => {
    return item.id;
  })).trigger('change');
});

$('.select2-clear_invites').on('click', function(e) {
  e.preventDefault();
  $('#invite-contributors.js-select2').val(null).trigger('change');
});


const getSuggestions = () => {
  let queryParams = {};

  queryParams.keywords = $('#keywords').val();
  queryParams.invite = params.get('invite') || '';

  let searchParams = new URLSearchParams(queryParams);

  const settings = {
    url: `/api/v0.1/get_suggested_contributors?${searchParams}`,
    method: 'GET',
    processData: false,
    dataType: 'json',
    contentType: false
  };

  $.ajax(settings).done(function(response) {
    let groups = {
      'contributors': 'Recently worked with you',
      'recommended_developers': 'Recommended based on skills',
      'verified_developers': 'Verified contributors',
      'invites': 'Invites'
    };

    let options = Object.entries(response).map(([ text, children ]) => (
      { text: groups[text], children }
    ));

    usersBySkills = [].map.call(response['recommended_developers'], function(obj) {
      return obj;
    });

    if (queryParams.keywords.length && usersBySkills.length) {
      $('#invite-all-container').show();
      $('.select2-add_byskill span').text(queryParams.keywords.join(', '));
    } else {
      $('#invite-all-container').hide();
    }

    var generalIndex = 0;

    processedData = $.map(options, function(obj, index) {
      if (obj.children.length < 1) {
        return;
      }

      obj.children.forEach((children, childIndex) => {
        children.text = children.fulfiller_github_username || children.user__profile__handle || children.handle;
        children.id = generalIndex;
        if (obj.text == 'Invites') {
          children.selected = true;
          $('#reserve-section').collapse('show');
        }
        generalIndex++;
      });
      return obj;
    });

    $('#invite-contributors').select2().empty();
    $('#invite-contributors.js-select2').select2({
      data: processedData,
      placeholder: 'Select contributors',
      escapeMarkup: function(markup) {
        return markup;
      },
      templateResult: formatUser,
      templateSelection: formatUserSelection
    });

  }).fail(function(error) {
    console.log('Could not fetch contributors', error);
  });
};

getSuggestions();
$('#keywords').on('change', getSuggestions);

function formatUser(user) {
  if (user.children) {
    return user.text;
  }

  let markup = `<div class="d-flex align-items-baseline">
                  <div class="mr-2">
                    <img class="rounded-circle" src="${'/dynamic/avatar/' + user.text }" width="20" height="20"/>
                  </div>
                  <div>${user.text}</div>
                </div>`;

  return markup;
}

function formatUserSelection(user) {
  let selected;

  if (user.id) {
    selected = `
      <img class="rounded-circle" src="${'/dynamic/avatar/' + user.text }" width="20" height="20"/>
      <span class="ml-2">${user.text}</span>`;
  } else {
    selected = user.text;
  }
  return selected;
}

function lastSynced(current, last_sync) {
  return timeDifference(current, last_sync);
}

const setPrivateForm = () => {
  $('#description, #title').prop('readonly', false);
  $('#description, #title').prop('required', true);
  $('#no-issue-banner').hide();
  $('#issue-details').removeClass('issue-details-public');
  $('#issue-details, #issue-details-edit').show();
  $('#sync-issue').removeClass('disabled');
  $('#last-synced, #edit-issue, #sync-issue').hide();
  $('#show_email_publicly').attr('disabled', true);
  $('#cta-subscription, #private-repo-instructions').removeClass('d-md-none');
  $('#nda-upload').show();
  $('#issueNDA').prop('required', true);
  $('.permissionless').addClass('disabled');
  $('#permissionless').attr('disabled', true);
  $('#admin_override_suspend_auto_approval').prop('checked', false);
  $('#admin_override_suspend_auto_approval').attr('disabled', true);
  $('#keywords').select2({
    placeholder: 'Select tags',
    tags: 'true',
    allowClear: true,
    tokenSeparators: [ ',', ' ' ]
  }).trigger('change');
};

const setPublicForm = () => {
  $('#description, #title').prop('readonly', true);
  $('#no-issue-banner').show();
  $('#issue-details').addClass('issue-details-public');
  $('#issue-details, #issue-details-edit').hide();
  $('#sync-issue').addClass('disabled');
  $('.js-submit').addClass('disabled');
  $('#last-synced, #edit-issue , #sync-issue').show();
  $('#show_email_publicly').attr('disabled', false);
  $('#cta-subscription, #private-repo-instructions').addClass('d-md-none');
  $('#nda-upload').hide();
  $('#issueNDA').prop('required', false);
  $('.permissionless').removeClass('disabled');
  $('#permissionless').attr('disabled', false);
  $('#admin_override_suspend_auto_approval').prop('checked', true);
  $('#admin_override_suspend_auto_approval').attr('disabled', false);
  retrieveIssueDetails();
};

/**
 * Checks if token used to fund bounty is authed.
 */
const handleTokenAuth = () => {
  return new Promise((resolve) => {
    const tokenName = $('#token option:selected').text();
    const tokenAddress = $('#token option:selected').val();
    let isTokenAuthed = true;

    const authedTokens = [ 'ETH', 'ETC' ];

    if (!token) {
      isTokenAuthed = false;
      tokenAuthAlert(isTokenAuthed);
      resolve(isTokenAuthed);
    } else if (authedTokens.includes(tokenName)) {
      tokenAuthAlert(isTokenAuthed);
      resolve(isTokenAuthed);
    } else {
      const token_contract = web3.eth.contract(token_abi).at(tokenAddress);
      const from = web3.eth.coinbase;
      const to = bounty_address();

      token_contract.allowance.call(from, to, (error, result) => {

        if (error || result.toNumber() == 0) {
          isTokenAuthed = false;
        }
        tokenAuthAlert(isTokenAuthed, tokenName);
        resolve(isTokenAuthed);
      });
    }
  });
};

/**
 * Toggles alert to notify user while bounty creation using an
 * un-authed token.
 * @param {boolean} isTokenAuthed - Token auth status for user
 * @param {string=}  tokenName - token name
 */
const tokenAuthAlert = (isTokenAuthed, tokenName) => {
  $('.alert').remove();

  if (isTokenAuthed) {
    $('.alert').remove();
    $('#add-token-dialog').bootstrapModal('hide');
    $('#token-denomination').html('');
  } else {
    tokenName = tokenName ? tokenName : '';
    _alert(
      gettext(`
        This token ${tokenName} needs to be enabled to fund this bounty, click on
        <a class="font-weight-semibold" href="/settings/tokens">
          the Token Settings page and enable it.
        </a> This is only needed once per token.`
      ),
      'warning'
    );

    $('#token-denomination').html(tokenName);
    $('#add-token-dialog').bootstrapModal('show');
  }
};


const updateViewForToken = (token_name) => {

  if (token_name == 'ETC') {
    $('.eth-chain').hide();
    FEE_PERCENTAGE = 0;
  } else {
    $('.eth-chain').show();
    FEE_PERCENTAGE = document.FEE_PERCENTAGE / 100.0;
  }

};


$(function() {

  $('#last-synced').hide();
  $('.js-select2').each(function() {
    $(this).select2({
      minimumResultsForSearch: Infinity
    });
  });

  let checked = params.get('type');

  if (params.has('type')) {

    $(`.${checked}`).button('toggle');

  } else {
    params.append('type', 'public');
    window.history.replaceState({}, '', location.pathname + '?' + params);
  }
  toggleCtaPlan(checked);

  $('input[name=repo_type]').change(function() {
    toggleCtaPlan($(this).val());
  });

  populateBountyTotal();

  // Load sidebar radio buttons from localStorage
  if (getParam('source')) {
    $('input[name=issueURL]').val(getParam('source'));
  } else if (getParam('url')) {
    $('input[name=issueURL]').val(getParam('url'));
  } else if (localStorage['issueURL']) {
    $('input[name=issueURL]').val(localStorage['issueURL']);
  }


  setTimeout(setUsdAmount, 1000);

  // fetch issue URL related info
  $('input[name=hours]').keyup(setUsdAmount);
  $('input[name=hours]').blur(setUsdAmount);
  $('input[name=amount]').keyup(setUsdAmount);

  $('input[name=usd_amount]').on('focusin', function() {
    $('input[name=usd_amount]').attr('prev_usd_amount', $(this).val());
    $('input[name=amount]').trigger('change');

  });

  $('input[name=usd_amount]').on('focusout', function() {
    $('input[name=usd_amount]').attr('prev_usd_amount', $(this).val());
    $('input[name=amount]').trigger('change');
  });

  $('input[name=usd_amount]').keyup(() => {
    const prev_usd_amount = $('input[name=usd_amount]').attr('prev_usd_amount');
    const usd_amount = $('input[name=usd_amount').val();

    $('input[name=amount]').trigger('change');

    if (prev_usd_amount != usd_amount) {
      usdToAmount(usd_amount);
    }
  });

  $('input[name=amount]').on('change', function() {
    const amount = $('input[name=amount]').val();

    $('#summary-bounty-amount').html(amount);
    $('#summary-fee-amount').html((amount * FEE_PERCENTAGE).toFixed(4));
    populateBountyTotal();
  });

  var triggerDenominationUpdate = function(e) {
    setUsdAmount();
    handleTokenAuth();
    const token_val = $('select[name=denomination]').val();
    const tokendetails = tokenAddressToDetails(token_val);
    var token = tokendetails['name'];

    updateViewForToken(token);

    $('#summary-bounty-token').html(token);
    $('#summary-fee-token').html(token);
    populateBountyTotal();
  };

  $('select[name=denomination]').change(triggerDenominationUpdate);
  waitforWeb3(function() {
    setTimeout(function() {
      triggerDenominationUpdate();
    }, 1000);
  });

  $('#featuredBounty').on('change', function() {
    if ($(this).prop('checked')) {
      if (document.FEE_PERCENTAGE == 0)
        $('#confirmation').html('2');
      else
        $('#confirmation').html('3');

      $('.feature-amount').show();
    } else {
      if (document.FEE_PERCENTAGE == 0)
        $('#confirmation').html('1');
      else
        $('#confirmation').html('2');

      $('.feature-amount').hide();
    }
    populateBountyTotal();
  });


  $('[name=project_type]').on('change', function() {
    let val = $('input[name=project_type]:checked').val();

    if (val !== 'traditional') {
      $('#reservedFor').attr('disabled', true);
      $('#reservedFor').select2().trigger('change');
    } else {
      $('#reservedFor').attr('disabled', false);
      userSearch('#reservedFor', false);
    }
  });

  if ($('input[name=issueURL]').val() != '' && !isPrivateRepo) {
    retrieveIssueDetails();
  }

  $('select[name=denomination]').select2();
  if ($('input[name=amount]').val().trim().length > 0) {
    setUsdAmount();
  }

  if (params.get('reserved')) {
    $('#reserve-section').collapse('show');
  }

  userSearch(
    '#reservedFor',
    // show address
    false,
    // theme
    '',
    // initial data
    params.get('reserved') ? [params.get('reserved')] : [],
    // allowClear
    true
  );

  $('input[name="expirationTimeDelta"]').daterangepicker({
    singleDatePicker: true,
    startDate: moment().add(1, 'month'),
    alwaysShowCalendars: false,
    ranges: {
      '1 week': [ moment().add(7, 'days'), moment().add(7, 'days') ],
      '2 weeks': [ moment().add(14, 'days'), moment().add(14, 'days') ],
      '1 month': [ moment().add(1, 'month'), moment().add(1, 'month') ],
      '3 months': [ moment().add(3, 'month'), moment().add(3, 'month') ],
      '1 year': [ moment().add(1, 'year'), moment().add(1, 'year') ]
    },
    'locale': {
      'customRangeLabel': 'Custom',
      'format': 'MM/DD/YYYY'
    }
  });

});

$('#reservedFor').on('select2:select', (e) => {
  $('#permissionless').click();
  $('#releaseAfterFormGroup').show();
  $('#releaseAfter').attr('required', true);
});

$('#reservedFor').on('select2:unselect', (e) => {
  $('#releaseAfterFormGroup').hide();
  $('#releaseAfter').attr('required', false);
  $('#releaseAfterFormGroup').addClass('releaseAfterFormGroupRequired');
});

$('#releaseAfter').on('change', () => {
  $('#releaseAfterFormGroup').removeClass('releaseAfterFormGroupRequired');
});

$('#sync-issue').on('click', function(event) {
  event.preventDefault();
  if (!$('#sync-issue').hasClass('disabled')) {
    new_bounty.last_sync = new Date();
    retrieveIssueDetails();
    $('#last-synced span').html(lastSynced(new Date(), new_bounty.last_sync));
  }
});

$('#issueURL').focusout(function() {

  for (let i = 0; i < document.blocked_urls.length; i++) {
    let this_url_filter = document.blocked_urls[i];

    if ($('input[name=issueURL]').val().toLowerCase().indexOf(this_url_filter.toLowerCase()) != -1) {
      _alert('This repo is not bountyable at the request of the maintainer.');
      $('input[name=issueURL]').val('');
      return false;
    }
  }

  if (isPrivateRepo) {
    setPrivateForm();
    var validated = $('input[name=issueURL]').val() == '' || !validURL($('input[name=issueURL]').val());

    if (validated) {
      $('.js-submit').addClass('disabled');
    } else {
      $('.js-submit').removeClass('disabled');
    }
    return;
  }

  setInterval(function() {
    $('#last-synced span').html(timeDifference(new Date(), new_bounty.last_sync));
  }, 6000);

  if ($('input[name=issueURL]').val() == '' || !validURL($('input[name=issueURL]').val())) {
    $('#issue-details, #issue-details-edit').hide();
    $('#no-issue-banner').show();

    $('#title').val('');
    $('#description').val('');

    $('#last-synced').hide();
    $('.js-submit').addClass('disabled');
  } else {
    $('#edit-issue').attr('href', $('input[name=issueURL]').val());

    $('#sync-issue').removeClass('disabled');
    $('.js-submit').removeClass('disabled');

    new_bounty.last_sync = new Date();
    retrieveIssueDetails();
    $('#last-synced').show();
    $('#last-synced span').html(lastSynced(new Date(), new_bounty.last_sync));
  }
});

const togggleEnabled = function(checkboxSelector, targetSelector, do_focus, revert) {
  let check = revert ? ':unchecked' : ':checked';
  let isChecked = $(checkboxSelector).is(check);

  if (isChecked) {
    $(targetSelector).attr('disabled', false);

    if (do_focus) {
      $(targetSelector).focus();
    }
  } else {
    $(targetSelector).attr('disabled', true);
    if ($(targetSelector).hasClass('select2-hidden-accessible')) {
      $(targetSelector).select2().trigger('change');
    }
  }
};

$('#hiringRightNow').on('click', () => {
  togggleEnabled('#hiringRightNow', '#jobDescription', true);
});

$('#specialEvent').on('click', () => {
  togggleEnabled('#specialEvent', '#eventTag', true);
});

$('#neverExpires').on('click', () => {
  togggleEnabled('#neverExpires', '#expirationTimeDelta', false, true);
});

$('#submitBounty').validate({
  errorPlacement: function(error, element) {
    if (element.attr('name') == 'bounty_categories') {
      error.appendTo($(element).parents('.btn-group-toggle').next('.cat-error'));
    } else {
      error.insertAfter(element);
    }
  },
  ignore: '',
  messages: {
    select2Start: {
      required: 'Please select the right keywords.'
    }
  },
  submitHandler: function(form) {
    if (typeof ga != 'undefined') {
      dataLayer.push({
        'event': 'new_bounty',
        'category': 'new_bounty',
        'action': 'new_bounty_form_submit'
      });
    }

    const token = $('#summary-bounty-token').html();
    const data = transformBountyData(form);

    if (token == 'ETC') {
      /*
        TODO:
        1. TRIGGER DB UPDATE
        2. REDESIGN METAMASK LOCK NOTIFICATION
      */
      createBounty(data);
    } else {
      ethCreateBounty(data);
    }
  }
});

$('[name=permission_type]').on('change', function() {
  var val = $('input[name=permission_type]:checked').val();

  if (val === 'approval') {
    $('#admin_override_suspend_auto_approval').attr('disabled', false);
  } else {
    $('#admin_override_suspend_auto_approval').prop('checked', false);
    $('#admin_override_suspend_auto_approval').attr('disabled', true);
  }
});

var getBalance = (address) => {
  return new Promise (function(resolve, reject) {
    web3.eth.getBalance(address, function(error, result) {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });
  });
};

let usdFeaturedPrice = $('.featured-price-usd').text();
let ethFeaturedPrice;
let bountyFee;

getAmountEstimate(usdFeaturedPrice, 'ETH', (amountEstimate) => {
  ethFeaturedPrice = amountEstimate['value'];
  $('.featured-price-eth').text(`+${amountEstimate['value']} ETH`);
  $('#summary-feature-amount').text(`${amountEstimate['value']}`);
});

/**
 * Calculates total amount needed to fund the bounty
 * Bounty Amount + Fee + Featured Bounty
 */
const populateBountyTotal = () => {

  const amount = $('input[name=amount]').val();
  const fee = (amount * FEE_PERCENTAGE).toFixed(4);

  $('#summary-bounty-amount').html(amount);
  $('#summary-fee-amount').html(fee);

  const bountyToken = $('#summary-bounty-token').html();
  const bountyAmount = Number($('#summary-bounty-amount').html());
  const bountyFee = Number((bountyAmount * FEE_PERCENTAGE).toFixed(4));
  const isFeaturedBounty = $('input[name=featuredBounty]:checked').val();
  let totalBounty = Number((bountyAmount + bountyFee).toFixed(4));
  let total = '';

  if (isFeaturedBounty) {
    const featuredBountyAmount = Number($('#summary-feature-amount').html());

    if (bountyToken == 'ETH') {
      totalBounty = (totalBounty + featuredBountyAmount).toFixed(4);
      total = `${totalBounty} ETH`;
    } else {
      total = `${totalBounty} ${bountyToken} + ${featuredBountyAmount} ETH`;
    }
  } else {
    total = `${totalBounty} ${bountyToken}`;
  }

  $('.fee-percentage').html(FEE_PERCENTAGE * 100);
  $('#fee-amount').html(bountyFee);
  $('#fee-token').html(bountyToken);
  $('#summary-total-amount').html(total);
};

let isPrivateRepo = false;

const toggleCtaPlan = (value) => {
  if (value === 'private') {

    params.set('type', 'private');
    isPrivateRepo = true;
    setPrivateForm();
  } else {

    params.set('type', 'public');
    isPrivateRepo = false;
    setPublicForm();
  }
  window.history.replaceState({}, '', location.pathname + '?' + params);
};

/**
 * generates object with all the data submitted during
 * bounty creation
 * @param {object} form
 */
const transformBountyData = form => {
  let data = {};
  let disabled = $(form).find(':input:disabled').removeAttr('disabled');

  $.each($(form).serializeArray(), function() {
    if (data[this.name]) {
      data[this.name] += ',' + this.value;
    } else {
      data[this.name] = this.value;
    }
  });

  if (
    data.repo_type == 'private' &&
    data.project_type != 'traditional' &&
    data.permission_type != 'approval'
  ) {
    _alert(gettext('The project type and/or permission type of bounty does not validate for a private repo'));
    unloading_button($('.js-submit'));
    return;
  }

  disabled.attr('disabled', 'disabled');
  loading_button($('.js-submit'));

  const tokenAddress = data.denomination;
  const token = tokenAddressToDetails(tokenAddress);
  const reservedFor = $('.username-search').select2('data')[0];
  const releaseAfter = $('#releaseAfter').children('option:selected').val();
  const inviteContributors = $('#invite-contributors.js-select2').select2('data').map((user) => {
    return user.profile__id;
  });

  const metadata = {
    issueTitle: data.title,
    issueDescription: data.description,
    issueKeywords: data.keywords ? data.keywords : '',
    githubUsername: data.githubUsername,
    notificationEmail: data.notificationEmail,
    fullName: data.fullName,
    experienceLevel: data.experience_level,
    projectLength: data.project_length,
    bountyType: data.bounty_type,
    estimatedHours: data.hours,
    fundingOrganisation: data.fundingOrganisation,
    eventTag: data.specialEvent ? (data.eventTag || '') : '',
    is_featured: data.featuredBounty,
    repo_type: data.repo_type,
    featuring_date: data.featuredBounty && ((new Date().getTime() / 1000) | 0) || 0,
    reservedFor: reservedFor ? reservedFor.text : '',
    releaseAfter: releaseAfter !== 'Release To Public After' ? releaseAfter : '',
    tokenName: token['name'],
    invite: inviteContributors,
    bounty_categories: data.bounty_categories
  };

  data.metadata = metadata;

  return data;
};